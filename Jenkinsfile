pipeline {
    agent any

    environment {
        OCI_REGISTRY  = 'iad.ocir.io'               
        OCI_NAMESPACE = 'idxyojfomq6q'             
        BACK_IMAGE_NAME = 'backend'                
        FRONT_IMAGE_NAME = 'frontend'              
        KUBECONFIG    = '/home/opc/.kube/config'   
        OCI_CONFIG_FILE = '/var/lib/jenkins/.oci/config' 
        REPO_URL      = 'https://github.com/KevinSancz/jenkins-back.git'
        KUBE_API      = '150.230.171.99:6443'  // Asegúrate de que sea el endpoint correcto
    }

    stages {
        stage('Checkout Repositories') {
            steps {
                dir('repo') {
                    git url: "${REPO_URL}", branch: 'master'
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Backend Image') {
                    steps {
                        dir('repo/Back') {
                            script {
                                dockerImageBackend = docker.build("${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:${BUILD_NUMBER}")
                            }
                        }
                    }
                }
                stage('Frontend Image') {
                    steps {
                        dir('repo/Front') {
                            script {
                                dockerImageFrontend = docker.build("${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:${BUILD_NUMBER}")
                            }
                        }
                    }
                }
            }
        }

        stage('Push Docker Images to OCI Registry') {
            parallel {
                stage('Push Backend Image') {
                    steps {
                        script {
                            docker.withRegistry("https://${OCI_REGISTRY}", '15050001') {
                                dockerImageBackend.push("${BUILD_NUMBER}")
                                dockerImageBackend.push("latest")
                            }
                        }
                    }
                }
                stage('Push Frontend Image') {
                    steps {
                        script {
                            docker.withRegistry("https://${OCI_REGISTRY}", '15050001') {
                                dockerImageFrontend.push("${BUILD_NUMBER}")
                                dockerImageFrontend.push("latest")
                            }
                        }
                    }
                }
            }
        }

        stage('Verify Kubernetes Connection') {
            steps {
                script {
                    def kubeTest = sh(
                        script: "kubectl cluster-info --kubeconfig=${KUBECONFIG}",
                        returnStdout: true
                    ).trim()
                    echo "Kubernetes Cluster Info: ${kubeTest}"
                }
            }
        }

        stage('Ensure OCI Registry Secret Exists') {
            steps {
                script {
                    def secretExists = sh(
                        script: "kubectl get secret oci-registry-secret --kubeconfig=${KUBECONFIG} || echo 'NOT_FOUND'",
                        returnStdout: true
                    ).trim()

                    if (secretExists.contains("NOT_FOUND")) {
                        echo "Secret not found, creating it..."
                        sh """
                        kubectl create secret docker-registry oci-registry-secret \
                        --docker-server=${OCI_REGISTRY} \
                        --docker-username='${OCI_NAMESPACE}/kevin.sanchez@ebiw.mx' \
                        --docker-password='${DOCKER_PASS}' \
                        --docker-email='kevin.sanchez@ebiw.mx' \
                        --kubeconfig=${KUBECONFIG}
                        """
                    } else {
                        echo "OCI Registry Secret already exists."
                    }
                }
            }
        }

        stage('Deploy to OKE') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: '15050001', 
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    script {
                        def kubeTokenJson = sh(
                            script: """
                                OCI_CONFIG_FILE=${OCI_CONFIG_FILE} \
                                oci ce cluster generate-token \
                                    --cluster-id ocid1.cluster.oc1.iad.aaaaaaaaq4k6vopup3yyac3776sfrbr47jm2qp5j7db2upvmdcbwqn2rc55q \
                                    --region iad
                            """,
                            returnStdout: true
                        ).trim()

                        def kubeToken = sh(
                            script: "echo '${kubeTokenJson}' | jq -r '.status.token'",
                            returnStdout: true
                        ).trim()

                        withEnv(["KUBECONFIG=${KUBECONFIG}", "KUBE_TOKEN=${kubeToken}"]) {
                            sh """
                                sed -i "s/\\\${BUILD_NUMBER}/${BUILD_NUMBER}/g" repo/k8s/backend-deployment.yaml
                                sed -i "s/\\\${BUILD_NUMBER}/${BUILD_NUMBER}/g" repo/k8s/frontend-deployment.yaml

                                kubectl --token=$KUBE_TOKEN apply -f repo/k8s/backend-deployment.yaml
                                kubectl --token=$KUBE_TOKEN apply -f repo/k8s/frontend-deployment.yaml

                                kubectl --token=$KUBE_TOKEN rollout status deployment/backend
                                kubectl --token=$KUBE_TOKEN rollout status deployment/frontend
                            """
                        }
                    }
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh """
                docker rmi ${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:${BUILD_NUMBER} || true
                docker rmi ${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:${BUILD_NUMBER} || true
                docker image prune -f || true
                """
            }
        }
    }
}

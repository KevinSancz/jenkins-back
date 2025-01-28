pipeline {
    agent any

    environment {
        OCI_REGISTRY  = 'iad.ocir.io'               // Cambia según tu región
        OCI_NAMESPACE = 'idxyojfomq6q'             // Namespace en OCI
        BACK_IMAGE_NAME = 'backend'                // Nombre de la imagen del backend
        FRONT_IMAGE_NAME = 'frontend'              // Nombre de la imagen del frontend
        KUBECONFIG    = '/home/opc/.kube/config'   // Ruta del archivo kubeconfig en Jenkins
        OCI_CONFIG_FILE = '/var/lib/jenkins/.oci/config' // Ruta al archivo de configuración de OCI
        REPO_URL      = 'https://github.com/KevinSancz/jenkins-back.git' // URL del repositorio
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
                            docker.withRegistry("https://${OCI_REGISTRY}", 'oci-credentials') {
                                dockerImageBackend.push("${BUILD_NUMBER}")
                                dockerImageBackend.push("latest")
                            }
                        }
                    }
                }
                stage('Push Frontend Image') {
                    steps {
                        script {
                            docker.withRegistry("https://${OCI_REGISTRY}", 'oci-credentials') {
                                dockerImageFrontend.push("${BUILD_NUMBER}")
                                dockerImageFrontend.push("latest")
                            }
                        }
                    }
                }
            }
        }

        stage('Generate Kubernetes Manifests') {
            steps {
                script {
                    // Backend Deployment YAML
                    sh """
                    echo '
                    apiVersion: apps/v1
                    kind: Deployment
                    metadata:
                      name: backend
                    spec:
                      replicas: 2
                      selector:
                        matchLabels:
                          app: backend
                      template:
                        metadata:
                          labels:
                            app: backend
                        spec:
                          containers:
                          - name: backend
                            image: ${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:${BUILD_NUMBER}
                            ports:
                            - containerPort: 3000
                    ---
                    apiVersion: v1
                    kind: Service
                    metadata:
                      name: backend
                    spec:
                      selector:
                        app: backend
                      ports:
                      - port: 3000
                        targetPort: 3000
                      type: ClusterIP
                    ' > backend-deployment.yaml
                    """

                    // Frontend Deployment YAML
                    sh """
                    echo '
                    apiVersion: apps/v1
                    kind: Deployment
                    metadata:
                      name: frontend
                    spec:
                      replicas: 2
                      selector:
                        matchLabels:
                          app: frontend
                      template:
                        metadata:
                          labels:
                            app: frontend
                        spec:
                          containers:
                          - name: frontend
                            image: ${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:${BUILD_NUMBER}
                            ports:
                            - containerPort: 80
                            env:
                            - name: BACKEND_URL
                              value: "http://backend:3000"
                    ---
                    apiVersion: v1
                    kind: Service
                    metadata:
                      name: frontend
                    spec:
                      selector:
                        app: frontend
                      ports:
                      - port: 80
                        targetPort: 80
                      type: LoadBalancer
                    ' > frontend-deployment.yaml
                    """
                }
            }
        }

        stage('Deploy to OKE') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: '15050001', // ID de credenciales de OCI en Jenkins
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
                                kubectl --token=$KUBE_TOKEN apply -f backend-deployment.yaml
                                kubectl --token=$KUBE_TOKEN apply -f frontend-deployment.yaml
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

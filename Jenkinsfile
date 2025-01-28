pipeline {
    agent any

    environment {
        // Variables de entorno
        OCI_REGISTRY   = 'iad.ocir.io'
        OCI_NAMESPACE  = 'idxyojfomq6q'
        BACK_IMAGE_NAME  = 'backend'
        FRONT_IMAGE_NAME = 'frontend'
        REPO_URL       = 'https://github.com/tu-org/tu-repo.git'
        KUBECONFIG     = '/home/opc/.kube/config'
        OCI_CONFIG_FILE = '/var/lib/jenkins/.oci/config'
    }

    stages {
        stage('Checkout') {
            steps {
                dir('repo') {
                    git url: "${REPO_URL}", branch: 'master'
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('repo/Back') {
                            script {
                                dockerImageBackend = docker.build("${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:latest")
                            }
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('repo/Front') {
                            script {
                                dockerImageFrontend = docker.build("${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:latest")
                            }
                        }
                    }
                }
            }
        }

        stage('Push Docker Images') {
            parallel {
                stage('Push Backend') {
                    steps {
                        script {
                            docker.withRegistry("https://${OCI_REGISTRY}", '15050001') {
                                dockerImageBackend.push("latest")
                            }
                        }
                    }
                }
                stage('Push Frontend') {
                    steps {
                        script {
                            docker.withRegistry("https://${OCI_REGISTRY}", '15050001') {
                                dockerImageFrontend.push("latest")
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy to OKE') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: '15050001', // ID de credenciales
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    script {
                        // Si requieres token para 'kubectl --token', genera aquí.
                        // O asume que tu KUBECONFIG está configurado.
                        
                        sh """
                        # Aplica los manifiestos de k8s
                        kubectl apply -f repo/k8s/backend-deployment.yaml
                        kubectl apply -f repo/k8s/frontend-deployment.yaml

                        # Verifica rollout
                        kubectl rollout status deployment/backend
                        kubectl rollout status deployment/frontend
                        """
                    }
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh """
                docker rmi ${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:latest || true
                docker rmi ${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:latest || true
                docker image prune -f
                """
            }
        }
    }
}
